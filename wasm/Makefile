.PHONY: test clean

CFLAGS		=	-std=c++11 -Wall
LDFLAGS		=	-lsndfile

SRCS		=	main.cpp
TEST_SRC	=	test.cpp

OBJS	=	$(SRCS:.cpp=.o)

test: $(OBJS)
	@g++ $(CFLAGS) $(LDFLAGS) -o run_test $(OBJS) $(TEST_SRC)
	@./run_test

%.o : %.cpp
	g++ $(CFLAGS) -c $< -o $@

clean:
	rm $(OBJS)